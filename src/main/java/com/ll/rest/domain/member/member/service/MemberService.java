package com.ll.rest.domain.member.member.service;

import com.ll.rest.domain.member.member.entity.Member;
import com.ll.rest.domain.member.member.repository.MemberRepository;
import com.ll.rest.global.exceptions.ServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MemberService {
    private final MemberRepository memberRepository;

    public long count() {
        return memberRepository.count();
    }

    public Member join(String username, String password, String nickname) {
        memberRepository
                .findByUsername(username)
                .ifPresent(_ -> {
                    throw new ServiceException("400-1", "해당 username은 이미 사용중입니다.");
                });


        Member member = Member.builder()
                .username(username)
                .password(password)
                .nickname(nickname)
                .build();

        return memberRepository.save(member);
    }

    public Optional<Member> findByUsername(String username) {
        return memberRepository.findByUsername(username);
    }
}